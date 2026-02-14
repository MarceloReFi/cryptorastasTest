import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { v4 as uuidv4 } from "uuid";

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || "TEST-ACCESS-TOKEN",
});

export async function POST(request: NextRequest) {
  try {
    const { nftTokenId, nftPrice, walletAddress } = await request.json();

    // Convert ETH price to BRL (approximate - you'll want real-time rates)
    const ethToBrl = 18000; // 1 ETH ≈ R$18,000 (update with real API)
    const priceInBrl = parseFloat(nftPrice) * ethToBrl;

    const payment = new Payment(client);

    const paymentData = {
      transaction_amount: priceInBrl,
      description: `CryptoRasta NFT #${nftTokenId}`,
      payment_method_id: "pix",
      payer: {
        email: "buyer@example.com",
      },
      metadata: {
        nft_token_id: nftTokenId,
        wallet_address: walletAddress,
        eth_price: nftPrice,
      },
    };

    const response = await payment.create({ body: paymentData });

    return NextResponse.json({
      payment_id: response.id,
      qr_code: response.point_of_interaction?.transaction_data?.qr_code,
      qr_code_base64: response.point_of_interaction?.transaction_data?.qr_code_base64,
      ticket_url: response.point_of_interaction?.transaction_data?.ticket_url,
      amount_brl: priceInBrl,
    });
  } catch (error: any) {
    console.error("Payment creation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create payment" },
      { status: 500 }
    );
  }
}