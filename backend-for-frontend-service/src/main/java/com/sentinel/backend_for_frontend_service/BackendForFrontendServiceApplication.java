package com.sentinel.backend_for_frontend_service;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.context.annotation.ComponentScan;

@SpringBootApplication
@EnableFeignClients
@ComponentScan(basePackages = {"com.sentinel.backend_for_frontend_service", "com.sentinel.common.security"})
public class BackendForFrontendServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(BackendForFrontendServiceApplication.class, args);
	}

}
