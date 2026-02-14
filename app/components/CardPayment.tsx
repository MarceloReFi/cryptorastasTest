"use client";

import { initMercadoPago, CardPayment } from "@mercadopago/sdk-react";
import { useState } from "react";

initMercadoPago(process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY!);

interface CardPaymentFormProps {
  amount: number;
  onSuccess: (paymentId: string) => void;
  onError: (error: string) => void;
}

export default function CardPaymentForm({
  amount,
  onSuccess,
  onError,
}: CardPaymentFormProps) {
  const [loading, setLoading] = useState(false);

  const onSubmit = async (formData: {
    token: string;
    installments: number;
    payment_method_id: string;
    payer: {
      email: string;
      identification: { type: string; number: string };
    };
  }) => {
    setLoading(true);

    try {
      const response = await fetch("/api/mercadopago", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: formData.token,
          transaction_amount: amount,
          installments: formData.installments,
          payment_method_id: formData.payment_method_id,
          payer: formData.payer,
        }),
      });

      const result = await response.json();

      if (result.status === "approved") {
        onSuccess(result.id);
      } else {
        onError(`Payment ${result.status}: ${result.status_detail}`);
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  const onReady = () => {
    console.log("CardPayment Brick ready");
  };

  const onFormError = (error: unknown) => {
    console.error("Form error:", error);
  };

  return (
    <div className="w-full max-w-md">
      {loading && (
        <div className="text-center py-4">Processing payment...</div>
      )}
      <CardPayment
        initialization={{ amount }}
        onSubmit={onSubmit}
        onReady={onReady}
        onError={onFormError}
      />
    </div>
  );
}