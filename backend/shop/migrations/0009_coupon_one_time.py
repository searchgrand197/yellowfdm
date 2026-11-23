from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('shop', '0008_combo_extra_items'),
    ]

    operations = [
        migrations.AddField(
            model_name='coupon',
            name='one_time',
            field=models.BooleanField(
                default=False,
                help_text='If set, each phone number can use this coupon only once.',
            ),
        ),
    ]
