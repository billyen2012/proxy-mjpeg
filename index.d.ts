import { Request , Response, NextFunction } from "express";
import { IncomingMessage } from "http";

/// <reference types="node" />

/**
 * Modified by Bill Yen (billyen2012@gmail.com) 12/26/2021 \
 * Original @see https://github.com/legege/node-mjpeg-proxy#readme \
 * Using follow-redirects @see https://github.com/follow-redirects/follow-redirects
 */

export function extractBoundary(contentType:string):string

export class MjpegProxy {
    constructor({ mjpegUrl, cors, dynamicUrl, dynamicUrlQueryName }: {
        mjpegUrl?: string;
        cors?: boolean;
        dynamicUrl?: boolean;
        dynamicUrlQueryName?: string;
    });
    mjpegOptions: URL;
    audienceResponses: any[];
    newAudienceResponses: any[];
    boundary: string;
    globalMjpegResponse: IncomingMessage;
    mjpegRequest: any;
    req: Request;
    res: Response;
    cors: boolean;
    dynamicUrl: boolean;
    dynamicUrlQueryName: string;

    checkSetCorsHeader: (res: Response) => void;
    checkSetDynamicUrl: (req: Request) => void;
    proxyRequest: (req: Request, res: Response, next: NextFunction) => void;
    mjpegClientHandler: (req: IncomingMessage) => void;
    _newClient: (req: Request, res: Response) => void;
}
