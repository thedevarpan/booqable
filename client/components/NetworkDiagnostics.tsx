import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Loader2, Wifi } from 'lucide-react';

interface DiagnosticResult {
  test: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: string;
}

export default function NetworkDiagnostics() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [running, setRunning] = useState(false);

  const updateDiagnostic = (test: string, status: DiagnosticResult['status'], message: string, details?: string) => {
    setDiagnostics(prev => {
      const existing = prev.find(d => d.test === test);
      if (existing) {
        return prev.map(d => d.test === test ? { ...d, status, message, details } : d);
      } else {
        return [...prev, { test, status, message, details }];
      }
    });
  };

  const runDiagnostics = async () => {
    setRunning(true);
    setDiagnostics([]);

    // Test 1: Basic connectivity
    updateDiagnostic('connectivity', 'pending', 'Testing basic connectivity...');
    try {
      const start = Date.now();
      const response = await fetch('/api/ping');
      const duration = Date.now() - start;
      
      if (response.ok) {
        const data = await response.text();
        updateDiagnostic('connectivity', 'success', `Connected successfully (${duration}ms)`, data);
      } else {
        updateDiagnostic('connectivity', 'error', `HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      updateDiagnostic('connectivity', 'error', 'Connection failed', error instanceof Error ? error.message : String(error));
    }

    // Test 2: Collections API
    updateDiagnostic('collections', 'pending', 'Testing collections API...');
    try {
      const start = Date.now();
      const response = await fetch('/api/collections', {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      const duration = Date.now() - start;
      
      if (response.ok) {
        const data = await response.json();
        updateDiagnostic('collections', 'success', `Collections loaded (${duration}ms)`, `${data.data?.length || 0} collections found`);
      } else {
        updateDiagnostic('collections', 'error', `HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      updateDiagnostic('collections', 'error', 'Collections API failed', error instanceof Error ? error.message : String(error));
    }

    // Test 3: Products API
    updateDiagnostic('products', 'pending', 'Testing products API...');
    try {
      const start = Date.now();
      const response = await fetch('/api/products?page=1&limit=5', {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      const duration = Date.now() - start;
      
      if (response.ok) {
        const data = await response.json();
        updateDiagnostic('products', 'success', `Products loaded (${duration}ms)`, `${data.data?.products?.length || 0} products found`);
      } else {
        updateDiagnostic('products', 'error', `HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      updateDiagnostic('products', 'error', 'Products API failed', error instanceof Error ? error.message : String(error));
    }

    // Test 4: Browser environment
    updateDiagnostic('environment', 'pending', 'Checking browser environment...');
    try {
      const userAgent = navigator.userAgent;
      const isLocalhost = window.location.hostname === 'localhost';
      const protocol = window.location.protocol;
      const extensions = (window as any).chrome?.runtime ? 'Chrome extensions detected' : 'No Chrome extensions detected';
      
      updateDiagnostic('environment', 'success', 'Environment check complete', 
        `UA: ${userAgent}\nProtocol: ${protocol}\nHost: ${window.location.hostname}\n${extensions}`);
    } catch (error) {
      updateDiagnostic('environment', 'error', 'Environment check failed', error instanceof Error ? error.message : String(error));
    }

    setRunning(false);
  };

  const getIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'pending':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wifi className="h-5 w-5" />
          Network Diagnostics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runDiagnostics} 
          disabled={running}
          className="w-full"
        >
          {running ? 'Running Diagnostics...' : 'Run Network Tests'}
        </Button>

        {diagnostics.length > 0 && (
          <div className="space-y-3">
            {diagnostics.map((diagnostic) => (
              <div key={diagnostic.test} className="flex items-start gap-3 p-3 border rounded-lg">
                {getIcon(diagnostic.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium capitalize">{diagnostic.test}</span>
                    <Badge variant="outline" className={getStatusColor(diagnostic.status)}>
                      {diagnostic.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{diagnostic.message}</p>
                  {diagnostic.details && (
                    <details className="mt-2">
                      <summary className="text-xs cursor-pointer text-blue-600 hover:text-blue-800">
                        Show details
                      </summary>
                      <pre className="mt-1 text-xs bg-gray-50 p-2 rounded whitespace-pre-wrap">
                        {diagnostic.details}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
