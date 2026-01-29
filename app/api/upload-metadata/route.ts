import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { name, symbol, description, imageUrl } = await request.json();

    const metadata = {
      name,
      symbol,
      description,
      image: imageUrl,
      attributes: [],
      properties: {
        files: [
          {
            uri: imageUrl,
            type: 'image/png'
          }
        ],
        category: 'image',
      }
    };

    const pinataResponse = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'pinata_api_key': process.env.PINATA_API_KEY!,
        'pinata_secret_api_key': process.env.PINATA_SECRET_KEY!,
      },
      body: JSON.stringify(metadata),
    });

    const pinataData = await pinataResponse.json();
    
    if (!pinataResponse.ok) {
      console.error('Pinata metadata error:', pinataData);
      throw new Error('Failed to upload metadata');
    }

    const metadataUrl = `https://gateway.pinata.cloud/ipfs/${pinataData.IpfsHash}`;
    
    return NextResponse.json({ 
      success: true, 
      metadataUrl,
      ipfsHash: pinataData.IpfsHash 
    });

  } catch (error) {
    console.error('Metadata upload error:', error);
    return NextResponse.json({ 
      error: 'Failed to upload metadata' 
    }, { status: 500 });
  }
}