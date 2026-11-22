import razorpay
from django.conf import settings

client = razorpay.Client(auth=(settings.RAZORPAY_API_KEY, settings.RAZORPAY_API_SECRET))


def create_razorpay_order(amount_rupees: int, order_id: str = '') -> dict:
    return client.order.create(
        data={
            'amount': int(amount_rupees) * 100,
            'currency': 'INR',
            'payment_capture': '1',
            'notes': {'order_id': str(order_id)},
        }
    )


def verify_razorpay_signature(params: dict) -> None:
    client.utility.verify_payment_signature(params)
