import got from 'got';

function isURL(str: string) {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * A binary object attached to a Message.
 */
export class Embed {
  constructor(
    /**
     * The MIME content type of the object, e.g., "image/png" or "application/json".
     *
     * https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
     */
    public readonly contentType: string,
    /**
     * The base64-encoded data for this embed.
     */
    public readonly base64Data: string,
  ) {
    // This won't catch every type of non-base64 string, but it will catch a common mistake.
    if (isURL(base64Data)) {
      throw new Error(
        `Invalid base64 data: "${base64Data}". If you're trying to pass a URI, use Embed.fromUri() instead.`,
      );
    }
  }

  static async fromUri(contentType: string, uri: string): Promise<Embed> {
    const response = await got(uri, {
      responseType: 'buffer',
    });

    if (response.statusCode !== 200) {
      throw new Error(`Got status code ${response.statusCode} when fetching ${uri}`);
    }

    return new Embed(contentType, response.body.toString('base64'));
  }
}
