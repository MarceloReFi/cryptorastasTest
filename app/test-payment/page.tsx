"use client";

import { useState } from "react";
import CardPaymentForm from "../components/CardPayment";

export default function TestPayment() {
  const [status, setStatus] = useState<string>("");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-zinc-50 dark:bg-black">
      <h1 className="text-2xl font-bold mb-6">Test Credit Card Payment</h1>
      
      <p className="mb-4 text-gray-600">Amount: R$ 10.00</p>

      {status && (
        <div className={`mb-4 p-4 rounded ${
          status.includes("Success") 
            ? "bg-green-100 text-green-800" 
            : "bg-red-100 text-red-800"
        }`}>
          {status}
        </div>
      )}

      <CardPaymentForm
        amount={10}
        onSuccess={(paymentId) => setStatus(`Success! Payment ID: ${paymentId}`)}
        onError={(error) => setStatus(`Error: ${error}`)}
      />
    </div>
  );
}