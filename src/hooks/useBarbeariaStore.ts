import { useState, useEffect, useCallback } from 'react';
import { apiFetch, checkApiHealth, getToken, TokenKind } from '../api/client';
import { AppNotification, Service, Barber, Appointment, BarbeariaConfig } from '../types';
import { DEFAULT_SERVICES, DEFAULT_BARBERS, DEFAULT_APPOINTMENTS } from '../data';
import { getShopBySlug } from '../shops';
import { writeShopJson, removeShopKey, setActiveShopSlug } from '../shopStorage';
import {
  appendNotifications,
  readNotifications,
  markNotificationRead,
  createCancellationNotifications
} from '../notifications';

function loadLocal<T>(baseKey: string, slug: string, fallback: T): T {
  const shopKey = `${baseKey}__${slug}`;
  const saved = localStorage.getItem(shopKey);
  if (saved) {
    try {
      return JSON.parse(saved) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export function useBarbeariaStore(slug: string) {
  const staticShop = getShopBySlug(slug);
  if (!staticShop) throw new Error(`Barbearia inválida: ${slug}`);

  setActiveShopSlug(slug);

  const [useApi, setUseApi] = useState(false);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<BarbeariaConfig>(staticShop.config);
  const [services, setServices] = useState<Service[]>(DEFAULT_SERVICES);
  const [barbers, setBarbers] = useState<Barber[]>(DEFAULT_BARBERS);
  const [appointments, setAppointments] = useState<Appointment[]>(DEFAULT_APPOINTMENTS);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const loadFromApi = useCallback(async () => {
    const data = await apiFetch<{
      config: BarbeariaConfig;
      services: Service[];
      barbers: Barber[];
      appointments: Appointment[];
      name: string;
      tagline: string;
    }>(`/shops/${slug}/public`);

    setConfig(data.config);
    setServices(data.services);
    setBarbers(data.barbers);
    setAppointments(data.appointments);

    try {
      const notifs = await apiFetch<AppNotification[]>(
        `/shops/${slug}/notifications`,
        {},
        'staff'
      );
      setNotifications(notifs);
    } catch {
      setNotifications([]);
    }
  }, [slug]);

  const loadLocalData = useCallback(() => {
    setConfig(loadLocal('barber_config', slug, staticShop.config));
    setServices(loadLocal('barber_services', slug, DEFAULT_SERVICES));
    setBarbers(loadLocal('barber_barbers', slug, DEFAULT_BARBERS));
    setAppointments(loadLocal('barber_appointments', slug, DEFAULT_APPOINTMENTS));
    setNotifications(readNotifications());
  }, [slug, staticShop.config]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const apiOk = await checkApiHealth();
      if (cancelled) return;
      setUseApi(apiOk);
      try {
        if (apiOk) await loadFromApi();
        else loadLocalData();
      } catch (e) {
        console.warn('[store] API falhou, usando localStorage', e);
        loadLocalData();
        setUseApi(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, loadFromApi, loadLocalData]);

  useEffect(() => {
    if (useApi || loading) return;
    writeShopJson('barber_config', config, slug);
  }, [config, slug, useApi, loading]);

  useEffect(() => {
    if (useApi || loading) return;
    writeShopJson('barber_services', services, slug);
  }, [services, slug, useApi, loading]);

  useEffect(() => {
    if (useApi || loading) return;
    writeShopJson('barber_barbers', barbers, slug);
  }, [barbers, slug, useApi, loading]);

  useEffect(() => {
    if (useApi || loading) return;
    writeShopJson('barber_appointments', appointments, slug);
  }, [appointments, slug, useApi, loading]);

  const persistConfig = async (next: BarbeariaConfig) => {
    setConfig(next);
    if (useApi) {
      await apiFetch(`/shops/${slug}/config`, { method: 'PUT', body: JSON.stringify(next) }, 'staff');
    }
  };

  const persistServices = async (next: Service[]) => {
    setServices(next);
    if (useApi) {
      const saved = await apiFetch<Service[]>(
        `/shops/${slug}/services`,
        { method: 'PUT', body: JSON.stringify(next) },
        'staff'
      );
      setServices(saved);
    }
  };

  const persistBarbers = async (next: Barber[]) => {
    setBarbers(next);
    if (useApi) {
      const saved = await apiFetch<Barber[]>(
        `/shops/${slug}/barbers`,
        { method: 'PUT', body: JSON.stringify(next) },
        'staff'
      );
      setBarbers(saved);
    }
  };

  const handleAddAppointment = useCallback(
    async (newApt: Appointment) => {
      if (useApi) {
        const created = await apiFetch<Appointment>(
          `/shops/${slug}/appointments`,
          { method: 'POST', body: JSON.stringify(newApt) },
          'customer'
        );
        setAppointments(prev => [created, ...prev]);
      } else {
        setAppointments(prev => [newApt, ...prev]);
      }
    },
    [slug, useApi]
  );

  const handleUpdateAppointment = useCallback(
    async (id: string, updates: Partial<Appointment>) => {
      if (useApi) {
        const updated = await apiFetch<Appointment>(
          `/shops/${slug}/appointments/${id}`,
          { method: 'PATCH', body: JSON.stringify(updates) },
          'staff'
        );
        setAppointments(prev => prev.map(a => (a.id === id ? updated : a)));
      } else {
        setAppointments(prev => prev.map(a => (a.id === id ? { ...a, ...updates } : a)));
      }
    },
    [slug, useApi]
  );

  const handleCancelAppointment = useCallback(
    async (id: string, refundPixKey?: string) => {
      const apt = appointments.find(a => a.id === id);
      if (useApi) {
        const tokenKind: TokenKind = getToken('staff') ? 'staff' : 'customer';
        await apiFetch(`/shops/${slug}/appointments/${id}`, { method: 'DELETE' }, tokenKind);
        if (apt) {
          setNotifications(appendNotifications(createCancellationNotifications(apt, refundPixKey)));
        }
      } else if (apt) {
        setNotifications(appendNotifications(createCancellationNotifications(apt, refundPixKey)));
      }
      setAppointments(prev => prev.filter(a => a.id !== id));
    },
    [appointments, slug, useApi]
  );

  const handleResetDemoData = useCallback(() => {
    if (!confirm('Deseja redefinir todos os horários e configurações desta barbearia?')) return;
    if (useApi) {
      alert('Reset completo disponível apenas no modo local. Use o painel SaaS para gerenciar dados.');
      return;
    }
    removeShopKey('barber_appointments', slug);
    removeShopKey('barber_config', slug);
    removeShopKey('barber_services', slug);
    removeShopKey('barber_barbers', slug);
    window.location.reload();
  }, [slug, useApi]);

  return {
    shop: staticShop,
    loading,
    useApi,
    config,
    setConfig: persistConfig,
    services,
    setServices: persistServices,
    barbers,
    setBarbers: persistBarbers,
    appointments,
    notifications,
    setNotifications,
    handleAddAppointment,
    handleUpdateAppointment,
    handleCancelAppointment,
    handleResetDemoData,
    markNotificationRead: (id: string) => setNotifications(markNotificationRead(id)),
    refresh: loadFromApi
  };
}

export type BarbeariaStore = ReturnType<typeof useBarbeariaStore>;
