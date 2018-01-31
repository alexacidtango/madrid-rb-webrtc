class HomeController < ApplicationController
  def show
    @random_number = rand(0...10_000)
  end
end
