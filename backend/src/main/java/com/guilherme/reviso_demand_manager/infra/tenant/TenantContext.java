// EXPERIMENTAL (fase 2 - multi-db). Veja README.md neste pacote.
package com.guilherme.reviso_demand_manager.infra.tenant;

public class TenantContext {
    
    private static final ThreadLocal<String> currentTenant = new ThreadLocal<>();
    
    public static void setCurrentTenant(String databaseName) {
        currentTenant.set(databaseName);
    }
    
    public static String getCurrentTenant() {
        return currentTenant.get();
    }
    
    public static void clear() {
        currentTenant.remove();
    }
}
