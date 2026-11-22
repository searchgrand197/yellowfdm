import re
import shutil
import sqlite3
from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils.text import slugify

from shop.models import Category, MenuItem, Order, Topping

V1_ROOT = Path(settings.BASE_DIR).parent / 'foodporiumv1.0'
V1_DB = V1_ROOT / 'db.sqlite3'
V1_MEDIA = V1_ROOT / 'media'


def make_unique_slug(name: str, used: set[str]) -> str:
    base = slugify(name) or 'item'
    slug = base
    n = 2
    while slug in used:
        slug = f'{base}-{n}'
        n += 1
    used.add(slug)
    return slug


def icon_for(name: str) -> str:
    key = name.lower()
    if 'burger' in key:
        return 'burger'
    if 'pizza' in key:
        return 'pizza'
    if 'fries' in key:
        return 'fries'
    if 'shake' in key or 'drink' in key:
        return 'drinks'
    if 'momo' in key or 'meat' in key:
        return 'meat'
    if 'pasta' in key:
        return 'pasta'
    if 'sandwich' in key:
        return 'sandwich'
    return 'food'


class Command(BaseCommand):
    help = 'Import categories, products, toppings, and images from foodporiumv1.0'

    def handle(self, *args, **options):
        if not V1_DB.exists():
            self.stderr.write(f'v1 database not found: {V1_DB}')
            return

        media_root = Path(settings.MEDIA_ROOT)
        media_root.mkdir(parents=True, exist_ok=True)

        for folder in ('images', 'categoryimg'):
            src = V1_MEDIA / folder
            dst = media_root / folder
            if src.exists():
                if dst.exists():
                    shutil.rmtree(dst)
                shutil.copytree(src, dst)
                self.stdout.write(f'Copied media/{folder}')

        con = sqlite3.connect(V1_DB)
        con.row_factory = sqlite3.Row
        cur = con.cursor()

        Order.objects.all().delete()
        MenuItem.objects.all().delete()
        Category.objects.all().delete()
        Topping.objects.all().delete()

        used_slugs: set[str] = set()
        cat_map: dict[int, Category] = {}
        topping_map: dict[int, Topping] = {}
        item_map: dict[int, MenuItem] = {}

        for row in cur.execute('SELECT id, name, price, available FROM homepage_topping'):
            topping = Topping.objects.create(
                name=row['name'],
                price=Decimal(str(row['price'] or 0)),
                available=bool(row['available']),
            )
            topping_map[row['id']] = topping

        cats = cur.execute(
            'SELECT id, name, image, "order" FROM homepage_category ORDER BY "order", id'
        ).fetchall()

        for row in cats:
            slug = make_unique_slug(row['name'], used_slugs)
            image = row['image'] or ''
            image_url = f'/media/{image}' if image else ''
            cat = Category.objects.create(
                name=row['name'],
                slug=slug,
                icon=icon_for(row['name']),
                image_url=image_url,
                sort_order=row['order'] or 0,
            )
            cat_map[row['id']] = cat

        items = cur.execute(
            '''SELECT id, name, description, price, discount, image, category_id,
                      available, average_rating, total_ratings
               FROM homepage_menuitem
               WHERE available = 1'''
        ).fetchall()

        created = 0
        for idx, row in enumerate(items):
            name = (row['name'] or '').strip()
            if not name or re.search(r'not for sale|testing', name, re.I):
                continue
            cat = cat_map.get(row['category_id'])
            if not cat:
                continue

            price = Decimal(str(row['price'] or 0))
            discount = Decimal(str(row['discount'] or 0))
            original = price + discount if discount > 0 else None
            image = row['image'] or ''
            if not image:
                continue

            rating = Decimal(str(row['average_rating'] or 0))
            if rating <= 0:
                rating = Decimal('4.5')
            reviews = int(row['total_ratings'] or 0)

            item = MenuItem.objects.create(
                category=cat,
                name=name,
                subtitle=cat.name,
                description=(row['description'] or '').strip()
                or f'Freshly prepared {name} from Foodporium.',
                price=price,
                original_price=original,
                image_url=f'/media/{image}',
                delivery_mins='25-35',
                free_delivery=True,
                rating=rating,
                review_count=reviews,
                is_popular=idx < 12 or reviews > 0,
                is_featured=idx == 0 or bool(discount > 0 and idx < 5),
                promo_label='Special Offer' if discount > 0 else '',
            )
            item_map[row['id']] = item
            created += 1

        links = cur.execute(
            'SELECT menuitem_id, topping_id FROM homepage_menuitem_toppings'
        ).fetchall()
        linked = 0
        for link in links:
            item = item_map.get(link['menuitem_id'])
            topping = topping_map.get(link['topping_id'])
            if item and topping:
                item.toppings.add(topping)
                linked += 1

        if not MenuItem.objects.filter(is_featured=True).exists():
            first = MenuItem.objects.filter(category__slug__icontains='burger').first() or MenuItem.objects.first()
            if first:
                first.is_featured = True
                first.promo_label = first.promo_label or f'{first.name} Special'
                first.save(update_fields=['is_featured', 'promo_label'])

        con.close()
        self.stdout.write(
            self.style.SUCCESS(
                f'Imported {Category.objects.count()} categories, {created} products, '
                f'{Topping.objects.count()} toppings ({linked} links) from foodporiumv1.0'
            )
        )
