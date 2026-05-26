const crypto = require('crypto');

const secretKey = '7adde4dce1d693fb9d054e37e5c62dd6c9cecaa5';
const params = {
    apiKey: '6746B9FF-40AE-41D0-B897-57D9BL53BE55',
    commerceOrder: 'SF-00000000-1779661759',
    subject: 'Membresía Scholar-Flow - 2 usuarios',
    currency: 'CLP',
    amount: 6000,
    email: 'admin@demo.scholarflow.app',
    urlConfirmation: 'http://localhost:8000/billing/webhook',
    urlReturn: 'http://localhost:3000/dashboard/suscripcion/retorno'
};

const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}${params[key]}`)
    .join('');

console.log("JS Concat Str:", sortedParams);

const signature = crypto
    .createHmac('sha256', secretKey)
    .update(sortedParams)
    .digest('hex');

console.log("JS Signature:", signature);
