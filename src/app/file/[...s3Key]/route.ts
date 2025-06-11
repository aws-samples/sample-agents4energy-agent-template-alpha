import { NextResponse } from 'next/server';
import outputs from '@/../amplify_outputs.json';
import { getUrl } from 'aws-amplify/storage';
import { Amplify } from 'aws-amplify';

interface PageProps {
  params: {
    s3Key: string[];
  };
}

export async function GET(request: Request, { params }: PageProps) {
  try {
    // return NextResponse.json({hello: "world"})
    const s3Key = params.s3Key.join('/');
    const s3KeyDecoded = s3Key.split('/').map((item: string) => decodeURIComponent(item)).join('/');

    // Configure Amplify with storage configuration
    Amplify.configure(outputs, { ssr: true })

    // Get a signed URL using Amplify Storage
    const { url: signedUrl } = await getUrl({ path: s3KeyDecoded });

    console.log('Signed URL: ', signedUrl)

    const fileResponse = await fetch(signedUrl);

    // return NextResponse.json({signedUrl: signedUrl.toString()})
    // return "Hello World"
    // return signedUrl
    return fileResponse

    // // Redirect to the signed URL for direct file access
    // return NextResponse.redirect(signedUrl);
  } catch (error) {
    console.error('Error serving file:', error);
    return NextResponse.json(
      { error: 'Error serving file' },
      { status: 500 }
    );
  }
}
