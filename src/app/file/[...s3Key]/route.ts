import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { NextResponse } from 'next/server';
import outputs from '@/../amplify_outputs.json';

const s3Client = new S3Client({
  region: outputs.storage.aws_region,
});

interface PageProps {
  params: {
    s3Key: string[];
  };
}

export async function GET(request: Request, { params }: PageProps) {
  try {
    const s3Key = params.s3Key.join('/');
    const bucket = outputs.storage.bucket_name;

    if (!bucket) {
      return NextResponse.json({ error: 'S3 bucket not configured' }, { status: 500 });
    }

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: s3Key,
    });

    // Generate a pre-signed URL that's valid for 5 minutes
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    // Redirect to the signed URL for direct file access
    return NextResponse.redirect(signedUrl);
  } catch (error) {
    console.error('Error serving file:', error);
    return NextResponse.json(
      { error: 'Error serving file' },
      { status: 500 }
    );
  }
}
