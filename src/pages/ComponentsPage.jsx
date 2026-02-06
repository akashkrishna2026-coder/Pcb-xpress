import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Cpu, Search, ShoppingCart } from 'lucide-react';
import { addCartItem, seedDefaultProductsIfEmpty } from '@/lib/storage';
import { formatInr } from '@/lib/currency';
import { api } from '@/lib/api';
import { useSearchParams } from 'react-router-dom';

const ComponentsPage = () => {
  const { toast } = useToast();
  const [params] = useSearchParams();
  const [query, setQuery] = useState('');
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 12;

  useEffect(() => {
    const q = params.get('q');
    if (q) setQuery(q);
  }, [params]);

  // Load products from API with pagination
  useEffect(() => {
    let aborted = false;
    (async () => {
      setLoading(true);
      try {
        const offset = (currentPage - 1) * itemsPerPage;
        const result = await api.listProducts({ q: query.trim(), limit: itemsPerPage, offset });
        if (!aborted) {
          setCatalog(result.items);
          setTotalItems(result.count);
        }
      } catch (err) {
        if (!aborted) {
          toast({ title: 'Error loading products', description: err.message });
        }
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => { aborted = true; };
  }, [query, currentPage]);

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page on search
  };

  return (
    <>
      <Helmet>
        <title>Components | PCB Xpress</title>
        <meta name="description" content="Browse common electronic components and request quotes for your BOM." />
      </Helmet>

      <section className="pt-28 md:pt-36 pb-8 bg-secondary">
        <div className="container">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tighter">Components Catalog</h1>
          <p className="text-muted-foreground mt-1">Search and pick parts for your design. Request a quote anytime.</p>
          <form className="mt-4 flex gap-2" onSubmit={handleSearch}>
            <Input placeholder="Search components..." value={query} onChange={(e) => setQuery(e.target.value)} />
            <Button type="submit" className="gap-2"><Search className="h-4 w-4" /> Search</Button>
          </form>
        </div>
      </section>

      <section className="py-12">
        <div className="container">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading components...</p>
          ) : catalog.length === 0 ? (
            <p className="text-sm text-muted-foreground">No components found.</p>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {catalog.map((item) => {
                  const handleAdd = () => {
                    addCartItem(item);
                    toast({ title: 'Added to cart', description: `${item.name} added.` });
                  };
                  return (
                    <ProductCard key={item.id} item={item} onAdd={handleAdd} />
                  );
                })}
              </div>

              {/* Pagination */}
              {totalItems > itemsPerPage && (
                <div className="mt-8 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} components
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>

                    {/* Page Numbers */}
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.ceil(totalItems / itemsPerPage) }, (_, i) => i + 1)
                        .filter(page => {
                          const totalPages = Math.ceil(totalItems / itemsPerPage);
                          if (totalPages <= 7) return true;
                          if (page === 1 || page === totalPages) return true;
                          if (Math.abs(page - currentPage) <= 1) return true;
                          return false;
                        })
                        .map((page, index, array) => (
                          <React.Fragment key={page}>
                            {index > 0 && array[index - 1] !== page - 1 && (
                              <span className="px-2 text-muted-foreground">...</span>
                            )}
                            <Button
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className="w-8 h-8 p-0"
                            >
                              {page}
                            </Button>
                          </React.Fragment>
                        ))}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalItems / itemsPerPage)))}
                      disabled={currentPage === Math.ceil(totalItems / itemsPerPage)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
};

const ProductCard = ({ item, onAdd }) => (
  <Card className="overflow-hidden">
    <div className="h-40 bg-accent/20 flex items-center justify-center overflow-hidden relative">
      {item.image_url ? (
        <img
          src={item.image_url}
          alt={item.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextElementSibling.style.display = 'flex';
          }}
        />
      ) : null}
      <div
        className={`w-full h-full bg-gradient-to-br from-primary/10 to-secondary ${item.image_url ? 'hidden' : 'flex'} items-center justify-center`}
      >
        <span className="opacity-30">
          <Cpu className="h-10 w-10" />
        </span>
      </div>
    </div>
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2 text-xl">
        <span className="inline-flex items-center justify-center h-9 w-9 rounded-md bg-primary/10 text-primary">
          <Cpu className="h-5 w-5" />
        </span>
        {item.name}
      </CardTitle>
    </CardHeader>
    <CardContent className="pt-0">
      <div className="text-sm text-muted-foreground">{item.products?.name || item.stores?.name}</div>
      <p className="text-sm mt-2">{item.description}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <div className="text-muted-foreground">Units</div>
          <div className="font-medium">{item.units || 'N/A'}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Stock</div>
          <div className="font-medium">{Number(item.stocks || 0).toLocaleString()}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Price</div>
          <div className="font-medium">{formatInr(item.price)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">GST</div>
          <div className="font-medium">{item.gst_percent}%</div>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Button className="ml-auto" onClick={onAdd}><ShoppingCart className="h-4 w-4 mr-2" /> Add to Cart</Button>
      </div>
    </CardContent>
  </Card>
);

export default ComponentsPage;
