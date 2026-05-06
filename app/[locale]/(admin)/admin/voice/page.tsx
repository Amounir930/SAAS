'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Phone, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

export default function AdminVoicePage() {
  const t = useTranslations('AdminVoice');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [accountSid, setAccountSid] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [apiKeySid, setApiKeySid] = useState('');
  const [apiKeySecret, setApiKeySecret] = useState('');
  const [twimlAppSid, setTwimlAppSid] = useState('');
  const [currency, setCurrency] = useState('usd');
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/admin/voice');
      if (res.ok) {
        const data = await res.json();
        if (data.configured && data.config) {
          setAccountSid(data.config.accountSid || '');
          setAuthToken(data.config.authToken || '');
          setApiKeySid(data.config.apiKeySid || '');
          setApiKeySecret(data.config.apiKeySecret || '');
          setTwimlAppSid(data.config.twimlAppSid || '');
          setCurrency(data.config.currency || 'usd');
          setIsActive(data.config.isActive ?? false);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/voice', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountSid,
          authToken,
          apiKeySid,
          apiKeySecret,
          twimlAppSid: twimlAppSid || null,
          currency,
          isActive,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(t('save_success'));
    } catch {
      toast.error(t('save_error'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-500/10 rounded-lg">
          <Phone className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="h-4 w-4" /> {t('credentials_title')}
          </CardTitle>
          <CardDescription>{t('credentials_desc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="accountSid">{t('account_sid')}</Label>
              <Input
                id="accountSid"
                type="password"
                value={accountSid}
                onChange={(e) => setAccountSid(e.target.value)}
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="authToken">{t('auth_token')}</Label>
              <Input
                id="authToken"
                type="password"
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiKeySid">{t('api_key_sid')}</Label>
              <Input
                id="apiKeySid"
                type="password"
                value={apiKeySid}
                onChange={(e) => setApiKeySid(e.target.value)}
                placeholder="SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiKeySecret">{t('api_key_secret')}</Label>
              <Input
                id="apiKeySecret"
                type="password"
                value={apiKeySecret}
                onChange={(e) => setApiKeySecret(e.target.value)}
                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="twimlAppSid">{t('twiml_app_sid')}</Label>
              <Input
                id="twimlAppSid"
                type="password"
                value={twimlAppSid}
                onChange={(e) => setTwimlAppSid(e.target.value)}
                placeholder="APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              />
              <p className="text-xs text-muted-foreground">{t('twiml_app_sid_hint')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Switch
                id="voiceActive"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
              <Label htmlFor="voiceActive" className="text-sm font-medium cursor-pointer">
                {isActive ? t('status_active') : t('status_inactive')}
              </Label>
            </div>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {t('save_btn')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
