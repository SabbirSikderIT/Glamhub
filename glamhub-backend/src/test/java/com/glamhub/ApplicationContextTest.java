package com.glamhub;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

/** Smoke test: every bean wires and every JPQL query validates against the entity model. */
@SpringBootTest
class ApplicationContextTest {
    @Test
    void contextLoads() { }
}
