import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true }, // e.g. X3D-2025-0001
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  credits: [
    {
      amount: Number,
      credits: Number,
      addedAt: Date,
    }
  ],
  amount: { type: Number, required: true }, // subtotal (excluding VAT)
  vat: { type: Number, default: 0 },        // VAT amount
  vatRate: { type: Number, default: 0 },    // e.g. 0.21
  
  isReverseCharge: { type: Boolean, default: false },
  vatNote: { type: String, default: "" },   // legal note if reverse charged
method: { type: String, default: "" }, 

  total: { type: Number, required: true },  // amount + VAT
  currency: { type: String, default: 'EUR' },

  stripePaymentId: String,

  billingInfo: {
    name: String,
    street: String,
    postalCode: String,
    city: String,
    country: String,        // ISO code (e.g. 'NL')
    countryName: String,    // Full name (e.g. 'Netherlands')
    companyName: String,
    vatNumber: String,
  },

  issuedAt: { type: Date, default: Date.now },
});

export const Invoice = mongoose.model('Invoice', invoiceSchema);
