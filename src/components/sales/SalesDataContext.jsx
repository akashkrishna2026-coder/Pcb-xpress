/**
 * SalesDataContext
 * 
 * Shared state provider for all Sales pages.
 * Fetches customers, enquiries, and follow-ups ONCE and exposes
 * refresh helpers so any page mutation automatically propagates
 * to every other page that reads the same data.
 */
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { getSalesToken } from '@/lib/storage';
import { api } from '@/lib/api';

const SalesDataContext = createContext(null);

export const useSalesData = () => {
  const ctx = useContext(SalesDataContext);
  if (!ctx) throw new Error('useSalesData must be used inside <SalesDataProvider>');
  return ctx;
};

export const SalesDataProvider = ({ children }) => {
  /* ---- shared state ---- */
  const [customers, setCustomers] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [customersFromQuotes, setCustomersFromQuotes] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingEnquiries, setLoadingEnquiries] = useState(false);
  const [loadingFollowups, setLoadingFollowups] = useState(false);

  // Track whether initial load has happened
  const initialised = useRef(false);

  /* ---- loaders (callable from any page) ---- */

  const refreshCustomers = useCallback(async () => {
    const token = getSalesToken();
    if (!token) return;
    setLoadingCustomers(true);
    try {
      const res = await api.getSalesCustomers(token, { limit: 1000 });
      setCustomers(res.customers || []);
    } catch (err) {
      console.error('[SalesData] customers load error', err);
    } finally {
      setLoadingCustomers(false);
    }
  }, []);

  const refreshCustomersFromQuotes = useCallback(async () => {
    const token = getSalesToken();
    if (!token) return;
    try {
      const res = await api.getCustomersFromQuotes(token);
      setCustomersFromQuotes(res.customers || []);
    } catch (err) {
      console.error('[SalesData] customersFromQuotes error', err);
    }
  }, []);

  const refreshQuotes = useCallback(async () => {
    const token = getSalesToken();
    if (!token) return;
    try {
      const res = await api.getSalesQuotes(token, { limit: 500 });
      setQuotes(res.quotes || []);
    } catch (err) {
      console.error('[SalesData] quotes load error', err);
    }
  }, []);

  const refreshEnquiries = useCallback(async () => {
    const token = getSalesToken();
    if (!token) return;
    setLoadingEnquiries(true);
    try {
      const res = await api.getEnquiries(token, { limit: 500 });
      setEnquiries(res.enquiries || []);
    } catch (err) {
      console.error('[SalesData] enquiries load error', err);
    } finally {
      setLoadingEnquiries(false);
    }
  }, []);

  const refreshFollowups = useCallback(async () => {
    const token = getSalesToken();
    if (!token) return;
    setLoadingFollowups(true);
    try {
      const res = await api.getSalesFollowups(token);
      setFollowups(res.followups || []);
    } catch (err) {
      console.error('[SalesData] followups load error', err);
    } finally {
      setLoadingFollowups(false);
    }
  }, []);

  /** Refresh everything – useful after a cross-cutting mutation */
  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshCustomers(),
      refreshCustomersFromQuotes(),
      refreshQuotes(),
      refreshEnquiries(),
      refreshFollowups(),
    ]);
  }, [refreshCustomers, refreshCustomersFromQuotes, refreshQuotes, refreshEnquiries, refreshFollowups]);

  /* ---- initial load on mount (only once) ---- */
  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    refreshAll();
  }, [refreshAll]);

  /* ---- re-fetch on window focus (like tab switch) ---- */
  useEffect(() => {
    const onFocus = () => { refreshAll(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refreshAll]);

  const value = {
    // data
    customers,
    customersFromQuotes,
    quotes,
    enquiries,
    followups,
    // loading flags
    loadingCustomers,
    loadingEnquiries,
    loadingFollowups,
    // refreshers
    refreshCustomers,
    refreshCustomersFromQuotes,
    refreshQuotes,
    refreshEnquiries,
    refreshFollowups,
    refreshAll,
  };

  return (
    <SalesDataContext.Provider value={value}>
      {children}
    </SalesDataContext.Provider>
  );
};

export default SalesDataProvider;
