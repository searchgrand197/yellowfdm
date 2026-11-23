import razorpay
from django.conf import settings


def get_razorpay_client() -> razorpay.Client:
    key = (settings.RAZORPAY_API_KEY or '').strip()
    secret = (settings.RAZORPAY_API_SECRET or '').strip()
    if not key or not secret:
        raise RuntimeError('Razorpay keys are missing. Set RAZORPAY_API_KEY and RAZORPAY_API_SECRET.')
    return razorpay.Client(auth=(key, secret))


def create_razorpay_order(amount_rupees: int, order_id: str = '') -> dict:
    client = get_razorpay_client()
    return client.order.create(
        data={
            'amount': int(amount_rupees) * 100,
            'currency': 'INR',
            'payment_capture': 1,
            'notes': {'order_id': str(order_id)},
        }
    )


def verify_razorpay_signature(params: dict) -> None:
    get_razorpay_client().utility.verify_payment_signature(params)
