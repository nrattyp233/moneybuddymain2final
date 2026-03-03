import { loadStripe } from '@stripe/stripe-js';

export const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_live_51T4fGFEzdNc25gpZF9PkyHD4hrOe8wXfqL3iBZoKAETsLZx2F2kfm5Ourq3A1Ozu3fgmfr25gCrkvPY0JoUwTo5N00mw8HIcFd');
