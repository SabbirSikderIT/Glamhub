package com.glamhub.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class MailService {
    private final JavaMailSender sender;
    private final String from;
    private final String username;

    public MailService(JavaMailSender sender, @Value("${app.mail-from:}") String from,
                       @Value("${spring.mail.username:}") String username) {
        this.sender = sender;
        this.from = from;
        this.username = username;
    }

    public boolean isConfigured() { return username != null && !username.isBlank(); }

    /** Returns true if the email was handed to the SMTP server. Never throws. */
    public boolean send(String to, String subject, String body) {
        if (!isConfigured()) {
            log.warn("Mail not configured (MAIL_USERNAME empty) - not sent to {}: {}", to, subject);
            return false;
        }
        try {
            SimpleMailMessage m = new SimpleMailMessage();
            m.setFrom(from.isBlank() ? username : from);
            m.setTo(to);
            m.setSubject(subject);
            m.setText(body);
            sender.send(m);
            return true;
        } catch (Exception e) {
            log.warn("Could not send email to {}: {}", to, e.getMessage());
            return false;
        }
    }
}
