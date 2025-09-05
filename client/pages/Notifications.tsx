import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Check, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "../contexts/AuthContext";
import { db, firebaseAvailable } from "../lib/firebase";
// Firestore functions are imported dynamically when needed to avoid network calls on module load

interface NotificationDoc {
  id: string;
  type: "order" | "wishlist" | "system";
  title: string;
  message: string;
  orderId?: string;
  isRead: boolean;
  createdAt?: any;
}

const formatTimeAgo = (date: Date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800)
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString();
};

export default function Notifications() {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<NotificationDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsub: any = null;
    let mounted = true;

    const start = async () => {
      if (!firebaseAvailable || !currentUser) {
        setNotifications([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const firestore = await import("firebase/firestore");
        const { collection, query, orderBy, onSnapshot } = firestore;
        const q = query(
          collection(db, "users", currentUser.uid, "notifications"),
          orderBy("createdAt", "desc"),
        );

        unsub = onSnapshot(
          q,
          (snap: any) => {
            if (!mounted) return;
            const list: NotificationDoc[] = snap.docs.map((d: any) => {
              const data: any = d.data();
              return {
                id: d.id,
                type: data.type,
                title: data.title,
                message: data.message,
                orderId: data.orderId,
                isRead: !!data.isRead,
                createdAt: data.createdAt,
              };
            });
            setNotifications(list);
            setLoading(false);
          },
          (err: any) => {
            console.error("Notifications snapshot error (Firestore):", err);
            setError("Failed to load notifications");
            setLoading(false);
          },
        );
      } catch (err) {
        console.warn(
          "Failed to initialize Firestore for notifications page:",
          err,
        );
        setError("Failed to load notifications");
        setLoading(false);
      }
    };

    start();

    return () => {
      mounted = false;
      try {
        if (unsub) unsub();
      } catch (e) {}
    };
  }, [currentUser]);

  const markAsRead = async (id: string) => {
    if (!firebaseAvailable || !currentUser) return;
    try {
      const { updateDoc, doc } = await import("firebase/firestore");
      await updateDoc(doc(db, "users", currentUser.uid, "notifications", id), {
        isRead: true,
      });
    } catch (err) {
      console.warn("Failed to mark notification as read:", err);
    }
  };

  const deleteNotification = async (id: string) => {
    if (!firebaseAvailable || !currentUser) return;
    try {
      const { deleteDoc, doc } = await import("firebase/firestore");
      await deleteDoc(doc(db, "users", currentUser.uid, "notifications", id));
    } catch (err) {
      console.warn("Failed to delete notification:", err);
    }
  };

  const markAllAsRead = async () => {
    if (!firebaseAvailable || !currentUser) return;
    try {
      const { collection, query, getDocs, writeBatch } = await import(
        "firebase/firestore"
      );
      const q = query(
        collection(db, "users", currentUser.uid, "notifications"),
      );
      const snap = await getDocs(q);
      const batch = writeBatch(db as any);
      snap.forEach((d: any) => batch.update(d.ref, { isRead: true }));
      await batch.commit();
    } catch (err) {
      console.warn("Failed to mark all notifications as read:", err);
    }
  };

  const clearAll = async () => {
    if (!firebaseAvailable || !currentUser) return;
    try {
      const { collection, query, getDocs, writeBatch } = await import(
        "firebase/firestore"
      );
      const q = query(
        collection(db, "users", currentUser.uid, "notifications"),
      );
      const snap = await getDocs(q);
      const batch = writeBatch(db as any);
      snap.forEach((d: any) => batch.delete(d.ref));
      await batch.commit();
    } catch (err) {
      console.warn("Failed to clear notifications:", err);
    }
  };

  if (!currentUser) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Notifications</h1>
        <p className="text-muted-foreground mb-6">
          Please log in to view your notifications.
        </p>
        <Button asChild>
          <Link to="/login">Login</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            All notifications for your account
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            Mark all read
          </Button>
          <Button variant="destructive" size="sm" onClick={clearAll}>
            <Trash2 className="h-4 w-4 mr-2" /> Clear all
          </Button>
        </div>
      </div>

      <Card>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="py-12 text-center text-muted-foreground">
              Loading notifications…
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2" />
              <div>No notifications</div>
            </div>
          ) : (
            <ScrollArea className="max-h-[60vh]">
              <div className="divide-y">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-4 flex items-start justify-between ${!n.isRead ? "bg-luxury-purple-50/50" : ""}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-medium">{n.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {n.createdAt?.toDate
                            ? formatTimeAgo(n.createdAt.toDate())
                            : "Just now"}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        {n.message}
                      </div>
                      {n.orderId && (
                        <div>
                          <Link
                            to={`/orders/${n.orderId}`}
                            className="text-sm text-luxury-purple-600 hover:underline"
                          >
                            View order
                          </Link>
                        </div>
                      )}
                      <div className="mt-3 flex items-center gap-2">
                        {!n.isRead && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => markAsRead(n.id)}
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Mark read
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteNotification(n.id)}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
