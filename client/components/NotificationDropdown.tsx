import { useEffect, useState } from "react";
import {
  Bell,
  Check,
  X,
  Package,
  Heart,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { cn } from "../lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { db, firebaseAvailable } from "@/lib/firebase";
// Note: firebase/firestore is imported lazily where used to avoid network activity during module import

interface NotificationDoc {
  id: string;
  type: "order" | "wishlist" | "system";
  title: string;
  message: string;
  orderId?: string;
  isRead: boolean;
  createdAt?: any;
}

const getNotificationIcon = (type: NotificationDoc["type"]) => {
  switch (type) {
    case "order":
      return <Package className="h-4 w-4 text-luxury-purple-600" />;
    case "wishlist":
      return <Heart className="h-4 w-4 text-luxury-emerald-600" />;
    case "system":
    default:
      return <AlertCircle className="h-4 w-4 text-blue-600" />;
  }
};

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

export function NotificationDropdown() {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<NotificationDoc[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Live subscribe to notifications (lazy-load firestore functions to avoid network activity on module import)
  useEffect(() => {
    let unsub: any = null;
    let mounted = true;

    const start = async () => {
      if (!firebaseAvailable || !currentUser) {
        setNotifications([]);
        return;
      }

      try {
        const firestore = await import("firebase/firestore");
        const { collection, query, orderBy, onSnapshot } = firestore;
        const qy = query(
          collection(db, "users", currentUser.uid, "notifications"),
          orderBy("createdAt", "desc"),
        );

        unsub = onSnapshot(
          qy,
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
          },
          (err: any) => {
            console.error("Notifications snapshot error (Firestore):", err);
            setNotifications([]);
          },
        );
      } catch (err) {
        console.warn(
          "Failed to initialize Firestore subscription for notifications:",
          err,
        );
        setNotifications([]);
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
      const { doc, updateDoc } = await import("firebase/firestore");
      const ref = doc(db, "users", currentUser.uid, "notifications", id);
      await updateDoc(ref, { isRead: true });
    } catch (e) {
      console.warn("markAsRead failed:", e);
    }
  };

  const markAllAsRead = async () => {
    if (!firebaseAvailable || !currentUser) return;
    try {
      const firestore = await import("firebase/firestore");
      const { collection, query, getDocs, writeBatch } = firestore;
      const q = query(
        collection(db, "users", currentUser.uid, "notifications"),
      );
      const snap = await getDocs(q);
      const batch = writeBatch(db as any);
      snap.forEach((d: any) => batch.update(d.ref, { isRead: true }));
      await batch.commit();
    } catch (e) {
      console.warn("markAllAsRead failed:", e);
    }
  };

  const deleteNotification = async (id: string) => {
    if (!firebaseAvailable || !currentUser) return;
    try {
      const { deleteDoc, doc } = await import("firebase/firestore");
      await deleteDoc(doc(db, "users", currentUser.uid, "notifications", id));
    } catch (e) {
      console.warn("deleteNotification failed:", e);
    }
  };

  const clearAllNotifications = async () => {
    if (!firebaseAvailable || !currentUser) return;
    try {
      const firestore = await import("firebase/firestore");
      const { collection, query, getDocs, writeBatch } = firestore;
      const q = query(
        collection(db, "users", currentUser.uid, "notifications"),
      );
      const snap = await getDocs(q);
      const batch = writeBatch(db as any);
      snap.forEach((d: any) => batch.delete(d.ref));
      await batch.commit();
    } catch (e) {
      console.warn("clearAllNotifications failed:", e);
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs bg-luxury-gold-500 text-white">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0" sideOffset={8}>
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs h-7 px-2 text-luxury-purple-600 hover:text-luxury-purple-700"
              >
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllNotifications}
                className="text-xs h-7 px-2 text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No notifications</p>
          </div>
        ) : (
          <ScrollArea className="max-h-96">
            <div className="divide-y">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "p-4 hover:bg-muted/50 cursor-pointer transition-colors group",
                    !n.isRead && "bg-luxury-purple-50/50",
                  )}
                  onClick={() => markAsRead(n.id)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p
                          className={cn(
                            "text-sm font-medium truncate",
                            !n.isRead
                              ? "text-foreground"
                              : "text-muted-foreground",
                          )}
                        >
                          {n.title}
                        </p>
                        <div className="flex items-center space-x-1 ml-2">
                          {!n.isRead && (
                            <div className="h-2 w-2 bg-luxury-purple-600 rounded-full" />
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(n.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-muted-foreground hover:text-red-600"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 max-h-8 overflow-hidden">
                        {n.message}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">
                          {n.createdAt?.toDate
                            ? formatTimeAgo(n.createdAt.toDate())
                            : "Just now"}
                        </span>
                        {!n.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(n.id);
                            }}
                            className="text-xs h-6 px-2 text-luxury-purple-600 hover:text-luxury-purple-700"
                          >
                            <Check className="h-3 w-3 mr-1" /> Mark read
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-luxury-purple-600 hover:text-luxury-purple-700 hover:bg-luxury-purple-50"
                onClick={() => {
                  setIsOpen(false);
                  window.location.href = "/notifications";
                }}
              >
                View all notifications
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
