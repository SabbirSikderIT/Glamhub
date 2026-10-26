package com.glamhub.util;

import com.glamhub.exception.ApiException;
import com.glamhub.model.User;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class CurrentUser {
    private CurrentUser() {}

    /** The logged-in user, or null for anonymous requests. */
    public static User orNull() {
        Authentication a = SecurityContextHolder.getContext().getAuthentication();
        return a != null && a.getPrincipal() instanceof User u ? u : null;
    }

    public static User require() {
        User u = orNull();
        if (u == null) throw ApiException.unauthorized("Please log in to continue.");
        return u;
    }
}
