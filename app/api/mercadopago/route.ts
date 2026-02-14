import { MercadoPagoConfig, Payment } from "mercadopago";
import { NextRequest, NextResponse } from "next/server";

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const payment = new Payment(client);

    const result = await payment.create({
      body: {
        transaction_amount: body.transaction_amount,
        token: body.token,
        description: body.description || "CryptoRastas - Crypto Purchase",
        installments: body.installments || 1,
        payment_method_id: body.payment_method_id,
        payer: {
          email: body.payer.email,
          identification: body.payer.identification,
        },
      },
    });

    return NextResponse.json({
      id: result.id,
      status: result.status,
      status_detail: result.status_detail,
    });
  } catch (error: unknown) {
    console.error("Payment error:", error);
    const errorMessage = error instanceof Error ? error.message : "Payment failed";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}