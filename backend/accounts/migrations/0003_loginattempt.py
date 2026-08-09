from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_alter_user_phone'),
    ]

    operations = [
        migrations.CreateModel(
            name='LoginAttempt',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('identifier', models.CharField(max_length=254, help_text='The username or email the client attempted to authenticate with.')),
                ('ip_address', models.GenericIPAddressField()),
                ('success', models.BooleanField(default=False)),
                ('outcome', models.CharField(max_length=10, choices=[('failed', 'Failed'), ('success', 'Success')])),
                ('user_agent', models.TextField(blank=True)),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=models.deletion.SET_NULL, related_name='login_attempts', to='accounts.user')),
            ],
            options={
                'indexes': [
                    models.Index(fields=['-timestamp'], name='loginattempt_ts_desc'),
                    models.Index(fields=['identifier', '-timestamp'], name='loginattempt_ident_ts'),
                    models.Index(fields=['ip_address', '-timestamp'], name='loginattempt_ip_ts'),
                ],
            },
        ),
    ]
