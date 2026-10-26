package com.glamhub.service;

import com.glamhub.exception.ApiException;
import com.glamhub.model.User;
import com.glamhub.util.CurrentUser;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Only the one "main admin" account may do the most sensitive admin actions. */
@Component
public class MainAdminGuard {
    private final String mainEmail;

    public MainAdminGuard(@Value("${app.main-admin-email}") String mainEmail) { this.mainEmail = mainEmail; }

    public boolean isMain(User u) { return u != null && u.getEmail().equalsIgnoreCase(mainEmail); }

    public User require() {
        User u = CurrentUser.require();
        if (!isMain(u)) throw ApiException.forbidden("Only the main admin can do this.");
        return u;
    }
}
