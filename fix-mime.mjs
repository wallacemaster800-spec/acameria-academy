import { S3Client, ListObjectsV2Command, CopyObjectCommand } from "@aws-sdk/client-s3";

const client = new S3Client({
  region: "auto",
  endpoint: "https://a0d02b0187e5478c1a3d0c6b300e36ee.r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = "acameria";

async function fixMimeTypes() {
  let continuationToken;
  let fixed = 0;
  let skipped = 0;

  do {
    const list = await client.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      ContinuationToken: continuationToken,
    }));

    for (const obj of list.Contents ?? []) {
      if (!obj.Key.endsWith(".ts")) { skipped++; continue; }

      await client.send(new CopyObjectCommand({
        Bucket: BUCKET,
        CopySource: `${BUCKET}/${obj.Key}`,
        Key: obj.Key,
        ContentType: "video/mp2t",
        MetadataDirective: "REPLACE",
      }));

      fixed++;
      console.log(`✅ ${obj.Key}`);
    }

    continuationToken = list.NextContinuationToken;
  } while (continuationToken);

  console.log(`\nListo: ${fixed} archivos corregidos, ${skipped} ignorados.`);
}

fixMimeTypes().catch(console.error);