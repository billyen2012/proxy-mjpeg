# proxy-mjpeg
A node proxy for mjpeg
(This is a modification based on the [this](https://github.com/legege/node-mjpeg-proxy#readme))
# Motivation
I was working on a project that required building a proxy for mjpeg. (mjpeg is motion jpeg, which is a common file format for cctv)

Some mjpeg endpoints do not specify allow-origin-access-control in their header which causes cors error to some of the Browser APIs if included crossOrigin="anonymous" in the image tag.
Then I figured the best way is to use a proxy and add allow-origin-access-control="*" before sending it back to Browser.
# Dependencies
"follow-redirects": "^1.14.6"
# Installation
Download the index.js file and change it to any file name you want and then import it into your own project
# Important Note:
1. This version can only accept proxy url for https. To proxy to a http endpoint, you can try to modify the code and change the https to http in the code (there is only one place calling https)
2. To use DynamicUrl options, the http endpoint "must" be encoded with `encodeURIComponent()`.
# Example
1. With Dynamic URL
```javascript
import express from "express"

const app = express()
app.get(
  "/mjpeg-proxy",
  // must follow this way to pass the req,res from express,
  // or the new instance of socket will not be created for each.api call
  (req, res, next) => {
    new MjpegProxy(
      {
        cors: true, // will add allow-origin-access-control="*" to the respond header
        dynamicUrl: true, // if set to true, the property below also must be  defined
        dynamicUrlQueryName: "url" // this is for example only, you can define any query url key you want
      }
    ).proxyRequest(req, res, next)
  }
)
```
The example above will get and proxy request to the http endpoint after the `?url`
e.g. `http://localhost:port/mjpeg-proxy?url=https://.../.../.../` (and make sure the endpoint url is encoded with `encodeURIComponent()` before sending to the server)

2. For a Fix URL
```javascript
import express from "express"

const app = express()
app.get(
  "/mjpeg-proxy",
  // must follow this way to pass the req,res from express,
  // or the new instance of socket will not be created for each.api call
  (req, res, next) => {
    new MjpegProxy(
      {
        mjpegUrl:"https://example.com/mjpeg" // endpoint url
        cors: true, // will add allow-origin-access-control="*" to the respond header
      }
    ).proxyRequest(req, res, next)
  }
)
```

