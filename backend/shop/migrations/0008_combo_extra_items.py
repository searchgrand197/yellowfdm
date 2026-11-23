from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('shop', '0007_admin_ux_polish'),
    ]

    operations = [
        migrations.AddField(
            model_name='combo',
            name='item_c',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='combos_as_c',
                to='shop.menuitem',
            ),
        ),
        migrations.AddField(
            model_name='combo',
            name='item_d',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='combos_as_d',
                to='shop.menuitem',
            ),
        ),
    ]
