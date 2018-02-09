class HomeController < ApplicationController
  def show
    @random_number = rand(0...10_000)
    @ice_servers = XirsysGenerator.new.ice_servers
  end
end
