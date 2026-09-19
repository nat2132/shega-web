from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sync', '0004_pairinginvitation_device_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='syncdevice',
            name='platform',
            field=models.CharField(
                max_length=10,
                choices=[('mobile', 'Mobile'), ('desktop', 'Desktop')],
                default='mobile',
                blank=True,
            ),
        ),
    ]
