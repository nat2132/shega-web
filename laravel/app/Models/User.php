<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

/**
 * Django accounts.User — table `accounts_user`.
 * Password is stored Django-style (pbkdf2_sha256 or bcrypt); never Laravel hashes.
 */
class User extends Authenticatable
{
    use Notifiable;

    protected $table = 'accounts_user';

    public $timestamps = true;
    public const CREATED_AT = 'created_at';
    public const UPDATED_AT = 'updated_at';

    protected $fillable = [
        'password',
        'last_login',
        'is_superuser',
        'username',
        'first_name',
        'last_name',
        'email',
        'is_staff',
        'is_active',
        'date_joined',
        'phone',
        'business_name',
        'business_type',
        'address',
        'is_customer',
        'is_admin',
        'email_verified',
        'phone_verified',
        'notes',
    ];

    protected $hidden = ['password'];

    protected $casts = [
        'is_superuser' => 'boolean',
        'is_staff' => 'boolean',
        'is_active' => 'boolean',
        'is_customer' => 'boolean',
        'is_admin' => 'boolean',
        'email_verified' => 'boolean',
        'phone_verified' => 'boolean',
        'last_login' => 'datetime',
        'date_joined' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function getAuthIdentifierName(): string
    {
        return 'id';
    }

    public function getJwtSubjectKey(): string
    {
        return 'id';
    }

    public function getJwtPasswordHash(): string
    {
        return (string) $this->password;
    }

    public function businesses(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(User::class, 'accounts_businessmembership', 'user_id', 'business_id')
            ->withPivot('status', 'role', 'is_active')
            ->withTimestamps();
    }
}
