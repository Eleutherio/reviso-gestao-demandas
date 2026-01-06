package com.guilherme.reviso_demand_manager.web;

import com.guilherme.reviso_demand_manager.application.ClientService;
public class ClientController {

    private final ClientService clientService;

    public ClientController(ClientService clientService) {
        this.clientService = clientService;
    }
}
