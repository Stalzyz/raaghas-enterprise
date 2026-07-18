import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import * as os from 'os';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  private localIps = new Set<string>();

  // Use any for constructor arguments to avoid strict dependency injection signature issues
  constructor(options: any, storageService: any, reflector: any) {
    super(options, storageService, reflector);
    this.refreshLocalIps();
  }

  private refreshLocalIps() {
    this.localIps.clear();
    this.localIps.add('127.0.0.1');
    this.localIps.add('::1');
    this.localIps.add('::ffff:127.0.0.1');
    
    // Add all local network interfaces (including VPS public IP attached to eth0)
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      const ifaces = interfaces[name];
      if (ifaces) {
        for (const iface of ifaces) {
          this.localIps.add(iface.address);
          if (iface.family === 'IPv4') {
            this.localIps.add(`::ffff:${iface.address}`);
          }
        }
      }
    }
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    
    // If the request comes from our own server (Next.js SSR), bypass rate limiting
    // by returning a unique tracker per request so it never accumulates in a bucket.
    if (this.localIps.has(ip)) {
       return `bypass_${Math.random().toString(36).substring(7)}`;
    }

    return ip;
  }
}
