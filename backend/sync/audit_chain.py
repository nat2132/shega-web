"""§32 Backend audit-chain verification.

Clients (mobile + desktop) compute a SHA-256 hash chain over their audit
events, and the desktop hub — the authoritative LAN master — re-chains them
deterministically before pushing. This module stores that verified chain state
per business (see ``AuditChainCommit``) and lets the backend act as a root of
trust: it recomputes the chain from the committed per-record hashes and checks
continuity, count, and head-hash agreement.

The chain format mirrors the desktop/mobile clients (src/main/audit-chain.ts
and shega-mobile/src/database/db.ts): each record stores ``prev_hash``/``hash``
and the chain starts at GENESIS.
"""

from django.db import transaction

from .models import AuditChainCommit, SyncRecord

AUDIT_GENESIS = 'GENESIS'
CHAIN_NOT_FOUND = '__no_chain__'


def _recompute_from_records(records, record_count, head_hash):
    """Recompute the stored chain and return named invariants.

    ``records`` is an ordered list of ``{seq, prev_hash, hash}``. Returns a dict
    with ``ok`` (all invariants hold), ``count``, ``broken_at`` (first violating
    seq or None), ``head_match`` and ``count_match`` booleans, and ``message``.
    """
    count = len(records)
    count_match = count == record_count
    broken_at = None
    prev = AUDIT_GENESIS
    for idx, r in enumerate(records):
        prev_hash = r.get('prev_hash')
        cur_hash = r.get('hash')
        if prev_hash != prev or not cur_hash:
            broken_at = r.get('seq', idx)
            break
        prev = cur_hash
    head_match = prev == head_hash
    ok = count_match and broken_at is None and head_match
    if not ok:
        if broken_at is not None:
            message = f'chain breaks at seq {broken_at}'
        elif not count_match:
            message = 'record_count does not match number of stored records'
        else:
            message = 'head_hash does not match final record hash'
    else:
        message = 'chain intact'
    return {
        'ok': ok,
        'count': count,
        'broken_at': broken_at,
        'head_match': head_match,
        'count_match': count_match,
        'message': message,
    }


def verify_business_audit_chain(business_id):
    """Verify the latest committed audit chain for a business.

    Reads the current ``AuditChainCommit`` (the root-of-trust anchor) and
    recomputes/checks the chain from its stored per-record hashes.

    Returns ``{ok, exists, count, broken_at, head_match, count_match, message}``
    where ``exists`` is false when no commit has been submitted yet.
    """
    try:
        commit = AuditChainCommit.objects.get(business_id=business_id)
    except AuditChainCommit.DoesNotExist:
        return {
            'ok': False,
            'exists': False,
            'count': 0,
            'broken_at': None,
            'head_match': False,
            'count_match': True,
            'message': 'no audit chain commit on record for this business',
        }
    res = _recompute_from_records(commit.records, commit.record_count, commit.head_hash)
    res['exists'] = True
    res['committed_at'] = commit.committed_at
    res['device_id'] = commit.device.device_id
    return res


@transaction.atomic
def submit_audit_chain(
    business,
    device,
    record_count,
    head_hash,
    records,
):
    """Validate and upsert a business's audit chain commit.

    ``records`` must be an ordered list of ``{seq, prev_hash, hash}`` dicts. The
    stored chain is verified; if it is internally inconsistent it is still
    retained (so the admin endpoint can report the break), a re-submitted
    corrected chain replaces it.

    Returns ``{commit, verification}``.
    """
    if not isinstance(records, list):
        raise ValueError('records must be a list')
    if not isinstance(record_count, int) or record_count < 0:
        raise ValueError('record_count must be a non-negative integer')
    if not head_hash or len(head_hash) > 64:
        raise ValueError('head_hash must be a SHA-256 hex digest')

    canonical = []
    for idx, r in enumerate(records):
        if not isinstance(r, dict):
            raise ValueError('each record must be an object')
        prev_hash = str(r.get('prev_hash') or '')
        cur_hash = str(r.get('hash') or '')
        seq = r.get('seq', idx)
        canonical.append({'seq': seq, 'prev_hash': prev_hash, 'hash': cur_hash})

    commit, _ = AuditChainCommit.objects.update_or_create(
        business=business,
        defaults={
            'device': device,
            'record_count': record_count,
            'head_hash': head_hash,
            'records': canonical,
        },
    )
    verification = _recompute_from_records(canonical, record_count, head_hash)
    return {'commit': commit, 'verification': verification}


def chain_from_sync_records(business_id):
    """Build a chain record list from server-side ``SyncRecord`` audit rows.

    The cloud relay stores pushed audit records as ``SyncRecord`` rows with
    ``entity='audit'``; each row's ``checksum`` is the client-computed chain
    hash for that record. This helper canonicalizes them into the same
    ``{seq, prev_hash, hash}`` list the verifier expects, treating each pushed
    audit record as a link and GENESIS as the origin. It is used to seed a
    chain for businesses that have pushed audit records but never submitted an
    explicit commit.

    Returns ``(records, record_count, head_hash)``.
    """
    rows = list(
        SyncRecord.objects.filter(business_id=business_id, entity='audit')
        .order_by('client_seq', 'id')
    )
    records = []
    prev = AUDIT_GENESIS
    count = 0
    head = CHAIN_NOT_FOUND
    for r in rows:
        h = (r.checksum or '').strip()
        if not h:
            continue
        count += 1
        records.append({'seq': r.client_seq, 'prev_hash': prev, 'hash': h})
        prev = h
        head = h
    if not records:
        return [], 0, CHAIN_NOT_FOUND
    return records, count, head
