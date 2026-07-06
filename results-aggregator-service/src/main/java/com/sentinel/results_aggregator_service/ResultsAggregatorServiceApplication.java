package com.sentinel.results_aggregator_service;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.context.annotation.ComponentScan;

@SpringBootApplication
@ComponentScan(basePackages = {"com.sentinel.results_aggregator_service", "com.sentinel.common.security"})
@EnableFeignClients
public class ResultsAggregatorServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(ResultsAggregatorServiceApplication.class, args);
	}

}
