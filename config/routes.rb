Rails.application.routes.draw do
  resources :sessions, only: :create
  root 'home#show'

  mount ActionCable.server => "/cable"
end
