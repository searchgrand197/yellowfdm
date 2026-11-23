"""Seed Combo rows from the same pairings Discover used to invent client-side."""

from decimal import Decimal

from django.core.management.base import BaseCommand

from shop.models import Combo, MenuItem

ACCENTS = [
    'Hot deal',
    'Best value',
    'Chef pick',
    'Limited',
    'Street special',
    'Quick bite',
]


def _by_cat(items, slug):
    return [i for i in items if i.category and i.category.slug == slug]


def _first(*candidates):
    for c in candidates:
        if c is not None:
            return c
    return None


class Command(BaseCommand):
    help = 'Create default combo deals from menu items (idempotent by name)'

    def handle(self, *args, **options):
        items = list(
            MenuItem.objects.filter(available=True)
            .select_related('category')
            .order_by('sort_order', 'id')
        )
        if len(items) < 2:
            self.stderr.write('Need at least 2 menu items to seed combos')
            return

        burgers = _by_cat(items, 'burger')
        fries = _by_cat(items, 'fries')
        pizzas = _by_cat(items, 'pizza')
        momos = _by_cat(items, 'momo')
        pastas = _by_cat(items, 'pasta')
        sandwiches = _by_cat(items, 'sandwich')
        sides = fries or [i for i in items if i not in burgers]

        pairs = [
            (
                _first(burgers[0] if burgers else None),
                _first(fries[0] if fries else None, sides[0] if sides else None),
                'Burger Combo',
            ),
            (
                _first(burgers[1] if len(burgers) > 1 else None, burgers[0] if burgers else None),
                _first(
                    fries[1] if len(fries) > 1 else None,
                    fries[0] if fries else None,
                    sides[1] if len(sides) > 1 else None,
                    sides[0] if sides else None,
                ),
                'Power Meal',
            ),
            (
                _first(pizzas[0] if pizzas else None),
                _first(fries[0] if fries else None, sides[0] if sides else None),
                'Pizza Duo',
            ),
            (
                _first(pizzas[1] if len(pizzas) > 1 else None, pizzas[0] if pizzas else None),
                _first(
                    sandwiches[0] if sandwiches else None,
                    sides[1] if len(sides) > 1 else None,
                    sides[0] if sides else None,
                ),
                'Pizza Night',
            ),
            (
                _first(momos[0] if momos else None),
                _first(fries[0] if fries else None, sides[0] if sides else None),
                'Momo Feast',
            ),
            (
                _first(pastas[0] if pastas else None),
                _first(sandwiches[0] if sandwiches else None, sides[0] if sides else None),
                'Pasta Plate',
            ),
            (
                _first(sandwiches[0] if sandwiches else None),
                _first(fries[0] if fries else None, sides[0] if sides else None),
                'Snack Stack',
            ),
        ]

        created = 0
        for idx, (a, b, title) in enumerate(pairs):
            if not a or not b or a.id == b.id:
                continue
            total = a.price + b.price
            save = max(Decimal('15'), (total * Decimal('0.15')).quantize(Decimal('1')))
            price = max(Decimal('1'), total - save)
            # image_url is never seeded — upload a combo photo in admin.
            _, was_created = Combo.objects.update_or_create(
                name=title,
                defaults={
                    'badge': ACCENTS[idx % len(ACCENTS)],
                    'item_a': a,
                    'item_b': b,
                    'price': price,
                    'save_amount': save,
                    'sort_order': idx,
                    'active': True,
                },
            )
            created += 1 if was_created else 0
            self.stdout.write(f'{"Created" if was_created else "Updated"} {title}')

        if Combo.objects.count() == 0:
            for idx in range(min(5, len(items) - 1)):
                a, b = items[idx], items[idx + 1]
                total = a.price + b.price
                save = max(Decimal('15'), (total * Decimal('0.15')).quantize(Decimal('1')))
                Combo.objects.update_or_create(
                    name=f'{a.name} + {b.name}',
                    defaults={
                        'badge': ACCENTS[idx % len(ACCENTS)],
                        'item_a': a,
                        'item_b': b,
                        'price': max(Decimal('1'), total - save),
                        'save_amount': save,
                        'sort_order': idx,
                        'active': True,
                    },
                )
                created += 1

        self.stdout.write(
            self.style.SUCCESS(f'Done. Combos in DB: {Combo.objects.count()} (new: {created})')
        )
