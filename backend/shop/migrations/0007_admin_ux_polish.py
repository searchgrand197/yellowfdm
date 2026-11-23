from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('shop', '0006_admin_portal'),
    ]

    operations = [
        migrations.AddField(
            model_name='menuitem',
            name='sort_order',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AlterModelOptions(
            name='menuitem',
            options={'ordering': ['sort_order', '-is_popular', 'name']},
        ),
        migrations.AddField(
            model_name='shopsettings',
            name='opens_at',
            field=models.TimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='shopsettings',
            name='closes_at',
            field=models.TimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='coupon',
            name='min_order_value',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),
    ]
