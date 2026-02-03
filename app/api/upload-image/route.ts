import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Upload to Pinata
    const pinataFormData = new FormData();
    pinataFormData.append('file', file);

    const pinataResponse = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'pinata_api_key': process.env.PINATA_API_KEY!,
        'pinata_secret_api_key': process.env.PINATA_SECRET_KEY!,
      },
      body: pinataFormData,
    });

    const pinataData = await pinataResponse.json();
    
    if (!pinataResponse.ok) {
      console.error('Pinata error:', pinataData);
      throw new Error('Failed to upload to Pinata');
    }

    const imageUrl = `https://tan-worthy-zebra-831.mypinata.cloud/ipfs/${pinataData.IpfsHash}`;
    
    return NextResponse.json({ 
      success: true, 
      imageUrl,
      ipfsHash: pinataData.IpfsHash 
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ 
      error: 'Failed to upload image' 
    }, { status: 500 });
  }
}