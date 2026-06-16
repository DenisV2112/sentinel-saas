package com.sentinel.scaner_orchestrator_service;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableFeignClients
@EnableScheduling
public class ScanerOrchestratorServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(ScanerOrchestratorServiceApplication.class, args);
	}

}
