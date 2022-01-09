import initStripe from 'stripe';
const stripe = initStripe(process.env.STRIPE_SECRET_KEY);

const createCustomer = async () => {

}

export {
  createCustomer
}