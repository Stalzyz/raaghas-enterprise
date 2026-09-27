import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import * as os from 'os';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  private localIps = this.initializeLocalIps();

  private initializeLocalIps(): Set<string> {
    const ips = new Set<string>();
    ips.add('127.0.0.1');
    ips.add('::1');
    ips.add('::ffff:127.0.0.1');
    ips.add('72.61.231.187');
    ips.add('::ffff:72.61.231.187');
    
    // Add all local network interfaces (including VPS public IP attached to eth0)
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      const ifaces = interfaces[name];
      if (ifaces) {
        for (const iface of ifaces) {
          ips.add(iface.address);
          if (iface.family === 'IPv4') {
            ips.add(`::ffff:${iface.address}`);
          }
        }
      }
    }
    return ips;
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    
    // Check for internal secret token from Next.js server (immune to NAT routing issues)
    if (req.headers && req.headers['x-internal-secret'] === (process.env.INTERNAL_API_SECRET || 'raaghas_internal_bypass_99x')) {
       return `bypass_${Math.random().toString(36).substring(7)}`;
    }

    // If the request comes from our own server (Next.js SSR), bypass rate limiting
    // by returning a unique tracker per request so it never accumulates in a bucket.
    if (this.localIps.has(ip)) {
       return `bypass_${Math.random().toString(36).substring(7)}`;
    }

    return ip;
  }
}
