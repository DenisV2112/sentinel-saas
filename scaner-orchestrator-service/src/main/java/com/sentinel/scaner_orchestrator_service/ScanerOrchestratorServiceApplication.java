package com.sentinel.scaner_orchestrator_service;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@ComponentScan(basePackages = {"com.sentinel.scaner_orchestrator_service", "com.sentinel.common.security"})
@EnableFeignClients
@EnableScheduling
public class ScanerOrchestratorServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(ScanerOrchestratorServiceApplication.class, args);
	}

}
