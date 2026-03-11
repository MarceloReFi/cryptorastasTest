import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { orderHash, walletAddress } = await request.json();

    console.log("🔄 Fulfill-listing request:");
    console.log("Order Hash:", orderHash);
    console.log("Wallet:", walletAddress);

    const requestBody = {
      listing: {
        hash: orderHash,
        chain: "ethereum",
        protocol_address: "0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC",
      },
      fulfiller: {
        address: walletAddress,
      },
    };

    console.log("Request body:", JSON.stringify(requestBody, null, 2));

    const response = await fetch(
      "https://api.opensea.io/api/v2/listings/fulfillment_data",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": process.env.NEXT_PUBLIC_OPENSEA_API_KEY || "",
        },
        body: JSON.stringify(requestBody),
      }
    );

    console.log("OpenSea API Status:", response.status);

    const data = await response.json();
    console.log("OpenSea Response:", JSON.stringify(data, null, 2));

    if (data.errors && Array.isArray(data.errors)) {
      console.error("❌ OpenSea API Errors:", data.errors);
      return NextResponse.json(
        {
          error: "OpenSea API error",
          details: data.errors,
          message: data.errors.map((e: any) => e.message || e).join(", "),
        },
        { status: 400 }
      );
    }

    if (!data.fulfillment_data) {
      console.error("❌ No fulfillment_data in response");
      return NextResponse.json(
        {
          error: "Missing fulfillment data",
          response: data,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("💥 Fulfill-listing error:", error);
    return NextResponse.json(
      {
        error: "Failed to get fulfillment data",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
