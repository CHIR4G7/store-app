export type UserRole = "customer" | "worker" | "admin";

export type CurrentUser = {
  id: string;
  fullName: string;
  phone: string;
  role: UserRole;
};

const demoUser: CurrentUser = {
  id: "demo-customer",
  fullName: "Demo Customer",
  phone: "+91 98765 43210",
  role: "customer"
};

export function useCurrentUser() {
  return {
    user: demoUser,
    isLoading: false
  };
}

export function useRequireRole(role: UserRole) {
  const current = useCurrentUser();
  return {
    ...current,
    isAllowed: current.user.role === role
  };
}

export async function signOut() {
  return Promise.resolve();
}
