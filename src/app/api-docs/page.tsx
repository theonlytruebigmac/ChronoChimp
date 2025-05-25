'use client';

import { useEffect, useRef } from 'react';
import SwaggerUIBundle from 'swagger-ui-dist/swagger-ui-bundle';
import 'swagger-ui-dist/swagger-ui.css';
import '@/styles/swagger-ui-overrides.css';
import { Card } from '@/components/ui/card';

export default function ApiDocsPage() {
  const swaggerUI = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (swaggerUI.current) {
      SwaggerUIBundle({
        url: '/openapi.yaml',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
      });
    }
  }, []);

  return (
    <div className="container mx-auto p-4">
      <Card className="p-6 text-foreground">
        <div id="swagger-ui" ref={swaggerUI} />
      </Card>
    </div>
  );
}