
import redirect from "follow-redirects"
import { Response, Request, NextFunction } from "express"
import { IncomingMessage } from "http"

// having issue to directly deconstruct from import
const { https } = redirect

/**
 *
 * @param {string} contentType
 * @returns {string}
 */
function extractBoundary(contentType) {
  const boundaryKey = "boundary="
  const boundary = String(contentType)
    .split(boundaryKey)[1]
    .split(";")[0]
    .trim()
    .replace(/"/gi, '')
    .replace(/^\-\-/gi, '')

  return boundary
}

/**
 * Modified by Bill Yen (billyen2012@gmail.com) 12/26/2021 \
 * Original @see https://github.com/legege/node-mjpeg-proxy#readme \
 * Using follow-redirects @see https://github.com/follow-redirects/follow-redirects
 * ---
 * **Usage**
 * ```javascript
    import express from "express"
    const app = express()
    app.get(
      "/mjpeg-proxy",
      // must follow this way to pass the req,res from express, or the new instance of socket will not be created for each api call
      (req, res, next) => {
        new MjpegProxy(
          {
            cors: true,
            dynamicUrl: true,
            dynamicUrlQueryName: "url"
          }
        ).proxyRequest(req, res, next)
      }
    )
 * ```
 * ---
 */

export class MjpegProxy {
  constructor({ mjpegUrl = "", cors = false, dynamicUrl = false, dynamicUrlQueryName = "" }) {
    if (!dynamicUrl && !mjpegUrl) throw new Error('Please provide a source MJPEG URL');

    if (!dynamicUrl)
      this.mjpegOptions = new URL(mjpegUrl);

    this.audienceResponses = [];
    this.newAudienceResponses = [];

    this.boundary = null;
    this.globalMjpegResponse = null;
    this.mjpegRequest = null;

    this.req = null
    this.res = null
    // options
    this.cors = cors
    if (dynamicUrl && !dynamicUrlQueryName) throw new Error("If dynamicUrl is set to TRUE, them must provide the dynamicUrlQueryName")
    this.dynamicUrl = dynamicUrl
    this.dynamicUrlQueryName = dynamicUrlQueryName
  }
  /**
   *
   * @param {Response} res
   */
  checkSetCorsHeader = (res) => {
    if (this.cors) {
      res.setHeader("access-control-allow-origin", "*")
    }
  }
  /**
   *
   * @param {Request} req
   */
  checkSetDynamicUrl = (req) => {
    //console.log(req.query[this.dynamicUrlQueryName])
    if (this.dynamicUrl) {
      this.mjpegOptions = new URL(req.query[this.dynamicUrlQueryName])
    }
  }
  /**
   *
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   * @returns
   */
  proxyRequest = (req, res, next) => {
    const self = this
    self.req = req
    self.res = res
    if (res.socket == null) {
      return
    }
    // add cors based on user preference
    this.checkSetCorsHeader(res)
    // check if reset the url to the url in the designated query url
    this.checkSetDynamicUrl(req)
    // There is already another client consuming the MJPEG response
    if (self.mjpegRequest !== null) {
      self._newClient(req, res);
    } else {
      // Send source MJPEG request

      self.mjpegRequest = https.request(self.mjpegOptions, self.mjpegClientHandler);

      self.mjpegRequest.on('error', function (e) {
        console.error('problem with request: ', e);
      });
      self.mjpegRequest.end();
    }
  }
  /**
   *
   * @param {IncomingMessage} req
   */
  mjpegClientHandler = (req) => {
    const self = this
    self.globalMjpegResponse = req;
    self.boundary = extractBoundary(req.headers['content-type']);

    self._newClient(self.req, self.res);

    var lastByte1 = null;
    var lastByte2 = null;

    req.on('data', function (chunk) {
      // Fix CRLF issue on iOS 6+: boundary should be preceded by CRLF.
      var buff = Buffer.from(chunk);
      if (lastByte1 != null && lastByte2 != null) {
        var oldheader = '--' + self.boundary;

        var p = buff.indexOf(oldheader);

        if (p == 0 && !(lastByte2 == 0x0d && lastByte1 == 0x0a) || p > 1 && !(chunk[p - 2] == 0x0d && chunk[p - 1] == 0x0a)) {
          var b1 = chunk.slice(0, p);
          var b2 = Buffer.from('\r\n--' + self.boundary);
          var b3 = chunk.slice(p + oldheader.length);
          chunk = Buffer.concat([b1, b2, b3]);
        }
      }

      lastByte1 = chunk[chunk.length - 1];
      lastByte2 = chunk[chunk.length - 2];

      for (var i = self.audienceResponses.length; i--;) {
        var res = self.audienceResponses[i];

        // First time we push data... lets start at a boundary
        if (self.newAudienceResponses.indexOf(res) >= 0) {
          var p = buff.indexOf('--' + self.boundary);
          if (p >= 0) {
            res.write(chunk.slice(p));
            self.newAudienceResponses.splice(self.newAudienceResponses.indexOf(res), 1); // remove from new
          }
        } else {
          res.write(chunk);
        }
      }
    });
    req.on('end', function () {
      // console.log("...end");
      for (var i = self.audienceResponses.length; i--;) {
        var res = self.audienceResponses[i];
        res.end();
      }
    });
    req.on('close', function () {
      // console.log("...close");
    });
  }
  /**
   *
   * @param {Request} req
   * @param {Response} res
   */
  _newClient = (req, res) => {
    const self = this
    // make sure nothing is cached
    res.writeHead(200, {
      'Expires': 'Mon, 01 Jul 1980 00:00:00 GMT',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Content-Type': 'multipart/x-mixed-replace;boundary=' + self.boundary
    });

    self.audienceResponses.push(res);
    self.newAudienceResponses.push(res);

    res.socket.on('close', function () {
      // console.log('exiting client!');

      self.audienceResponses.splice(self.audienceResponses.indexOf(res), 1);
      if (self.newAudienceResponses.indexOf(res) >= 0) {
        self.newAudienceResponses.splice(self.newAudienceResponses.indexOf(res), 1); // remove from new
      }

      if (self.audienceResponses.length == 0) {
        self.mjpegRequest = null;
        if (self.globalMjpegResponse) {
          self.globalMjpegResponse.destroy();
        }
      }
    });
  }
}