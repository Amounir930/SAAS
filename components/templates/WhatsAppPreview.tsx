import React from 'react';
export const WhatsAppPreview = ({ data }: { data?: any }) => (
    <div className="p-4 border rounded bg-green-50">
        <div className="text-xs font-bold mb-2">WhatsApp Preview</div>
        {data ? (
            <pre className="text-[10px] opacity-70 overflow-auto max-h-40">
                {JSON.stringify(data, null, 2)}
            </pre>
        ) : (
            "No data to preview"
        )}
    </div>
);
