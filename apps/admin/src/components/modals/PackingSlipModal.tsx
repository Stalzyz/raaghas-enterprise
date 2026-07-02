import React from 'react';
import { X, Printer } from 'lucide-react';

interface PackingSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: any[];
  storeSettings?: any;
}

const getParsedAddress = (addr: any) =>
  typeof addr === 'string' ? JSON.parse(addr || '{}') : (addr || {});

function SlipContent({ order, storeSettings }: { order: any; storeSettings: any }) {
  const shippingAddr = order.shippingAddr || getParsedAddress(order.shippingAddress);
  
  const fromName = storeSettings?.storeName || 'Raaghas Clothing';
  const fromAddress = storeSettings?.businessAddress || '123 Fashion Street, Silk District';
  const fromCity = storeSettings?.businessCity || 'Chennai';
  const fromState = storeSettings?.businessState || 'Tamil Nadu';
  const fromZip = storeSettings?.businessZip || '600001';
  const fromPhone = storeSettings?.supportPhone || '';
  const fromEmail = storeSettings?.supportEmail || 'support@raaghas.in';
  const fromWebsite = storeSettings?.websiteUrl || 'www.raaghas.in';

  return (
    <div className="slip-container" style={{ width: '100%', height: '100%', boxSizing: 'border-box', padding: '0.25in', display: 'flex', flexDirection: 'column', backgroundColor: '#fff', color: '#000', fontFamily: 'sans-serif', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '0.1in', marginBottom: '0.15in' }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: '12pt', fontWeight: 'bold', textTransform: 'uppercase' }}>{fromName}</h1>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: '11pt', fontWeight: 'bold' }}>Order #{order.formattedOrderNumber || order.orderNumber || order.id.slice(-10).toUpperCase()}</p>
          <p style={{ margin: '2px 0 0', fontSize: '8pt' }}>Date: {new Date(order.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Ship To */}
      <div style={{ flex: 1, paddingLeft: '0.1in' }}>
        <h3 style={{ margin: '0 0 0.05in 0', fontSize: '9pt', fontWeight: 'bold', textTransform: 'uppercase' }}>SHIP TO</h3>
        <p style={{ margin: 0, fontSize: '12pt', fontWeight: 'bold' }}>{shippingAddr.name || order.customerName}</p>
        <p style={{ margin: '4px 0 0', fontSize: '9pt', lineHeight: 1.4 }}>
          {shippingAddr.address1 || shippingAddr.line1 || shippingAddr.address || ''}<br />
          {shippingAddr.address2 ? <>{shippingAddr.address2}<br /></> : null}
          {shippingAddr.city}, {shippingAddr.province || shippingAddr.state} {shippingAddr.zip || shippingAddr.postalCode}<br />
          {shippingAddr.country || 'India'}
        </p>
        {(shippingAddr.phone || order.customerPhone) && <p style={{ margin: '6px 0 0', fontSize: '9pt', fontWeight: 'bold' }}>{shippingAddr.phone || order.customerPhone}</p>}
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #000', paddingTop: '0.1in', marginTop: '0.2in', textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: '9pt', fontWeight: 'bold' }}>Thank you for shopping with us!</p>
        <p style={{ margin: '2px 0 0', fontSize: '7.5pt' }}>
          {fromName} | {fromEmail} | {fromWebsite}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: '6.5pt', color: '#444' }}>
          {fromAddress} {fromPhone ? `| Ph: ${fromPhone}` : ''}
        </p>
      </div>
    </div>
  );
}

export const PackingSlipModal: React.FC<PackingSlipModalProps> = ({ isOpen, onClose, orders, storeSettings }) => {
  if (!isOpen || !orders?.length) return null;

  const isBulk = orders.length > 1;

  const handlePrint = () => {
    const printContent = document.getElementById('packingslip-content');
    if (!printContent) return;

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) { document.body.removeChild(iframe); return; }

    doc.write(`
      <html>
        <head>
          <title>Packing Slip${isBulk ? 's' : ` - ${orders[0]?.id || ''}`}</title>
          <style>
            @page { size: A5; margin: 10pt; }
            body { font-family: sans-serif; margin: 0; padding: 0; background: #fff; }
            .page-break { page-break-after: always; }
            * { box-sizing: border-box; }
          </style>
        </head>
        <body>${printContent.innerHTML}</body>
      </html>
    `);
    doc.close();

    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 500);
    };
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="p-2 hover:bg-white rounded-lg transition-colors shadow-sm">
              <X size={20} className="text-gray-400" />
            </button>
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-900">
              {isBulk ? `Packing Slips (${orders.length})` : 'Packing Slip'}
            </h2>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-charcoal text-white rounded-lg text-xs font-bold shadow-sm hover:bg-wine transition-all"
          >
            <Printer size={16} /> {isBulk ? `Print ${orders.length} Slips` : 'Print Slip'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-gray-100 flex flex-col items-center">
          <div id="packingslip-content" className="space-y-4">
            {orders.map((order, i) => (
              <div key={order.id} className={i < orders.length - 1 ? 'page-break mb-8 shadow-sm border border-gray-200' : 'shadow-sm border border-gray-200'}>
                <SlipContent order={order} storeSettings={storeSettings} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
